package MetaKGS::Model;
use strict;
use warnings;
use Carp qw/croak/;
use MetaKGS;
use MetaKGS::Teng::Cursor;
use SQL::NamedPlaceholder qw/bind_named/;

sub import {
    my ( $class, $alias ) = @_;
    my $package = caller;

    my $TableName = $class;
       $TableName =~ s/.+:://;

    my $export = $alias || $TableName;
       $export = "$package\::$export";

    my $builder = sub {
        $class->new(
            teng => MetaKGS->context->teng,
        );
    };

    {
        no strict 'refs';
        *$export = $builder;
    }

    return;
}

sub table_name {
    croak 'call to abstract method ', __PACKAGE__, '::table_name';
}

sub new {
    my $class = shift;
    my %args = @_ == 1 ? %{$_[0]} : @_;
    my $self = bless {}, $class;

    for my $key (qw/teng/) {
        $self->{$key} = $args{$key} if exists $args{$key};
    }

    $self->init( \%args );

    $self;
}

sub init {
    my ( $self, $args ) = @_;

    for my $method (qw/where limit offset order_by/) {
        $self->$method( $args->{$method} ) if exists $args->{$method};
    }

    return;
}

sub teng {
    $_[0]->{teng};
}

sub where {
    my ( $self, @args ) = @_;
    $self->_condition( 'where', @args );
}

sub _condition {
    my ( $self, $key, @args ) = @_;

    return $self->{$key} unless @args;

    my $stuff = shift @args;
    my $condition = $self->teng->sql_builder->new_condition;

    if ( ref $stuff eq 'HASH' ) {
        for my $key ( keys %$stuff ) {
            $condition->add( $key => $stuff->{$key} );
        }
    }
    elsif ( ref $stuff eq 'ARRAY' ) {
        if ( ref $stuff->[1] eq 'HASH' ) {
            $condition->add_raw( bind_named @$stuff );
        }
        else {
            my ( $sql, @bind ) = @$stuff;
            $condition->add_raw( $sql, \@bind );
        }
    }
    else {
        $condition->add_raw( $stuff );
    }

    if ( exists $self->{$key} ) {
        $self->{$key} = $self->{$key}->compose_and( $condition );
    }
    else {
        $self->{$key} = $condition;
    }

    $self;
}

sub limit {
    my $self = shift;
    return $self->{limit} unless @_;
    $self->{limit} = shift;
    $self;
}

sub offset {
    my $self = shift;
    return $self->{offset} unless @_;
    $self->{offset} = shift;
    $self;
}

sub order_by {
    my ( $self, @args ) = @_;

    return $self->{order_by} unless @args;

    if ( exists $self->{order_by} ) {
        $self->{order_by} = [ @{$self->{order_by}}, @args ];
    }
    else {
        $self->{order_by} = \@args;
    }

    $self;
}

sub clone {
    my $self = shift;
    ref( $self )->new( %$self );
}

sub do_select {
    my $self = shift;
    my %args = @_ == 1 ? %{$_[0]} : @_;
    my $table_name = ref( $self )->table_name;

    my @columns;
    while ( my ($key, $value) = each %args ) {
        push @columns, [ $value, $key ];
    }

    my %options = (
        order_by => $self->order_by,
        limit    => $self->limit,
        offset   => $self->offset,
    );

    my ( $sql, @bind ) = $self->teng->sql_builder->select(
        $table_name,
        @columns ? \@columns : [ '*' ],
        $self->where,
        \%options,
    );

    MetaKGS::Teng::Cursor->new(
        teng  => $self->teng,
        query => [ $sql, \@bind ],
    );
}

sub do_delete {
    my ( $self, @args ) = @_;
    my $table_name = ref( $self )->table_name;
    $self = $self->clone->where( @args ) if @args;
    $self->teng->delete( $table_name, $self->where );
}

sub do_update {
    my $self = shift;
    my %set = @_ == 1 ? %{$_[0]} : @_;
    my $table_name = ref( $self )->table_name;

    my ( $sql, @bind ) = $self->teng->sql_builder->update(
        $table_name,
        \%set,
        $self->where
    );

    my $sth = $self->teng->execute( $sql, \@bind );
    my $rows = $sth->rows;
    $sth->finish;

    $rows;
}

sub do_insert {
    my $self = shift;
    my %values = @_ == 1 ? %{$_[0]} : @_;
    my $table_name = ref( $self )->table_name;

    my ( $sql, @bind ) = $self->teng->sql_builder->insert(
        $table_name,
        \%values
    );

    $self->teng->execute( $sql, \@bind );

    return;
}

1;
